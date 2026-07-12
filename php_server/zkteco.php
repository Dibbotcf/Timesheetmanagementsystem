<?php
/**
 * ZKTeco TCP Protocol — PHP Implementation
 * Uses fsockopen() TCP (avoids UDP which cPanel blocks).
 * Matches the packet structure used by node-zklib on the local Node.js server.
 *
 * TCP packet format:
 *   Outer 16-byte header: [magic 4B][payload_size 4B LE][zeros 8B]
 *   Inner command:        [cmd 2B LE][checksum 2B LE][session 2B LE][reply 2B LE][data...]
 */

define('ZKT_CMD_CONNECT',      1000);
define('ZKT_CMD_DISCONNECT',   1001);
define('ZKT_CMD_ACK_OK',       2000);
define('ZKT_CMD_ACK_ERROR',    2001);
define('ZKT_CMD_PREPARE_DATA', 1500);
define('ZKT_CMD_DATA',         1501);
define('ZKT_CMD_FREE_DATA',    1502);
define('ZKT_CMD_ATT_LOG',        13);
define('ZKT_CMD_USER_RRQ',        9);
define('ZKT_CMD_FREE_SIZES',     50);
define('ZKT_CMD_REFRESHDATA',  1013);
define('ZKT_CMD_USER_WRQ',        8);
define('ZKT_CMD_DELETE_USER',    18);

class ZKTeco
{
    private string $ip;
    private int    $port;
    private int    $timeout;
    /** @var resource|null */
    private $fp         = null;
    private int $session_id = 0;
    private int $reply_id   = 0;

    private const TCP_MAGIC = "\x50\x50\x82\x7d";

    public function __construct(string $ip, int $port = 4370, int $timeout = 10)
    {
        $this->ip      = $ip;
        $this->port    = $port;
        $this->timeout = $timeout;
    }

    // ── Checksum ──────────────────────────────────────────────────────────────
    private function calcChecksum(string $buf): int
    {
        $len = strlen($buf); $sum = 0; $i = 0;
        while ($len > 1) {
            $sum += unpack('v', substr($buf, $i, 2))[1];
            if ($sum > 0xFFFF) $sum -= 0xFFFF;
            $i += 2; $len -= 2;
        }
        if ($len > 0) $sum += ord($buf[$i]);
        while ($sum > 0xFFFF) $sum -= 0xFFFF;
        return 0xFFFF - $sum;
    }

    // ── Build 8-byte command packet ───────────────────────────────────────────
    private function buildPacket(int $cmd, string $data = ''): string
    {
        $raw = pack('v4', $cmd, 0, $this->session_id, $this->reply_id) . $data;
        $cs  = $this->calcChecksum($raw);
        return pack('v', $cmd) . pack('v', $cs)
             . pack('v', $this->session_id) . pack('v', $this->reply_id)
             . $data;
    }

    // ── Wrap inner packet with 16-byte TCP outer header ───────────────────────
    private function tcpWrap(string $inner): string
    {
        return self::TCP_MAGIC . pack('V', strlen($inner)) . str_repeat("\x00", 8) . $inner;
    }

    // ── Read exactly N bytes from the TCP stream ──────────────────────────────
    private function freadExact(int $n): string
    {
        $buf = '';
        $deadline = time() + $this->timeout;
        while (strlen($buf) < $n) {
            if (time() > $deadline) throw new RuntimeException('Read timeout');
            $chunk = fread($this->fp, $n - strlen($buf));
            if ($chunk === false || ($chunk === '' && feof($this->fp))) {
                throw new RuntimeException('Connection closed by device');
            }
            $buf .= $chunk;
        }
        return $buf;
    }

    // ── Read one TCP response packet (outer header + payload) ─────────────────
    private function tcpRead(): string
    {
        $hdr = $this->freadExact(16);
        // If device responds without outer TCP wrapper (fallback)
        if (substr($hdr, 0, 4) !== self::TCP_MAGIC) {
            // Treat the 16 bytes as the start of a raw 8-byte inner response
            return $hdr;
        }
        $payloadSize = unpack('V', substr($hdr, 4, 4))[1];
        if ($payloadSize === 0) return '';
        return $this->freadExact($payloadSize);
    }

    // ── Parse 8-byte response header ─────────────────────────────────────────
    private function parseHeader(string $raw): array
    {
        if (strlen($raw) < 8) throw new RuntimeException('Response too short (' . strlen($raw) . 'B)');
        $h = unpack('vcmd/vcs/vsession/vreply', substr($raw, 0, 8));
        return ['cmd' => (int)$h['cmd'], 'session' => (int)$h['session'], 'data' => substr($raw, 8)];
    }

    // ── Send command, read response ───────────────────────────────────────────
    private function execCmd(int $cmd, string $data = ''): array
    {
        fwrite($this->fp, $this->tcpWrap($this->buildPacket($cmd, $data)));
        $this->reply_id = ($this->reply_id + 1) & 0xFFFF;
        return $this->parseHeader($this->tcpRead());
    }

    // ── Retrieve a (potentially large) dataset ────────────────────────────────
    private function readDataset(int $cmd): string
    {
        try { $this->execCmd(ZKT_CMD_FREE_DATA); } catch (Throwable) {}

        fwrite($this->fp, $this->tcpWrap($this->buildPacket($cmd)));
        $this->reply_id = ($this->reply_id + 1) & 0xFFFF;

        $raw = $this->tcpRead();
        $res = $this->parseHeader($raw);

        if ($res['cmd'] === ZKT_CMD_DATA || $res['cmd'] === ZKT_CMD_ACK_OK) {
            return $res['data'];
        }

        if ($res['cmd'] === ZKT_CMD_PREPARE_DATA) {
            $expected  = strlen($res['data']) >= 4 ? unpack('V', substr($res['data'], 0, 4))[1] : 0;
            $collected = '';
            while (strlen($collected) < $expected) {
                try {
                    $packet = $this->tcpRead();
                    $cr     = $this->parseHeader($packet);
                    if ($cr['cmd'] === ZKT_CMD_DATA)          $collected .= $cr['data'];
                    elseif ($cr['cmd'] === ZKT_CMD_FREE_DATA) break;
                } catch (Throwable) { break; }
            }
            try { $this->execCmd(ZKT_CMD_FREE_DATA); } catch (Throwable) {}
            return $collected;
        }

        throw new RuntimeException("Unexpected device response cmd={$res['cmd']}");
    }

    // ── Decode ZKTeco proprietary timestamp ───────────────────────────────────
    private function decodeTime(int $t): string
    {
        $s  = $t % 60;       $t = intdiv($t - $s,  60);
        $mi = $t % 60;       $t = intdiv($t - $mi, 60);
        $h  = $t % 24;       $t = intdiv($t - $h,  24);
        $d  = $t % 31 + 1;   $t = intdiv($t - ($d - 1),  31);
        $mo = $t % 12 + 1;   $t = intdiv($t - ($mo - 1), 12);
        $y  = $t + 2000;
        return sprintf('%04d-%02d-%02dT%02d:%02d:%02d', $y, $mo, $d, $h, $mi, $s);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════════════════

    public function connect(): void
    {
        $errno = 0; $errstr = '';
        $fp = @fsockopen("tcp://{$this->ip}", $this->port, $errno, $errstr, $this->timeout);
        if ($fp === false) {
            throw new RuntimeException("Cannot reach device at {$this->ip}:{$this->port} — {$errstr} (err {$errno})");
        }
        stream_set_timeout($fp, $this->timeout);
        $this->fp         = $fp;
        $this->session_id = 0;
        $this->reply_id   = 0;

        fwrite($this->fp, $this->tcpWrap($this->buildPacket(ZKT_CMD_CONNECT)));
        $this->reply_id = ($this->reply_id + 1) & 0xFFFF;
        $res = $this->parseHeader($this->tcpRead());
        if ($res['cmd'] !== ZKT_CMD_ACK_OK) {
            throw new RuntimeException("Device rejected connection (cmd={$res['cmd']})");
        }
        $this->session_id = $res['session'];
    }

    public function disconnect(): void
    {
        if ($this->fp !== null) {
            try { $this->execCmd(ZKT_CMD_DISCONNECT); } catch (Throwable) {}
            fclose($this->fp);
            $this->fp = null;
        }
    }

    public function getInfo(): array
    {
        try {
            $res = $this->execCmd(ZKT_CMD_FREE_SIZES);
            $d   = $res['data'];
            if (strlen($d) >= 76) {
                return [
                    'userCounts'  => unpack('V', substr($d, 24, 4))[1],
                    'logCounts'   => unpack('V', substr($d, 40, 4))[1],
                    'logCapacity' => unpack('V', substr($d, 72, 4))[1],
                ];
            }
        } catch (Throwable) {}
        return ['userCounts' => null, 'logCounts' => null, 'logCapacity' => null];
    }

    public function getAttendances(): array
    {
        $data = $this->readDataset(ZKT_CMD_ATT_LOG);
        $len = strlen($data); $records = []; $i = 0;
        while ($i + 40 <= $len) {
            $uid    = unpack('v', substr($data, $i, 2))[1];
            $userId = rtrim(substr($data, $i + 2, 9), "\x00");
            $ts     = unpack('V', substr($data, $i + 12, 4))[1];
            $records[] = [
                'uid'          => $uid,
                'deviceUserId' => $userId !== '' ? $userId : (string)$uid,
                'recordTime'   => $this->decodeTime($ts),
            ];
            $i += 40;
        }
        return $records;
    }

    public function getUsers(): array
    {
        $data = $this->readDataset(ZKT_CMD_USER_RRQ);
        $len = strlen($data); $users = []; $i = 0;
        while ($i + 72 <= $len) {
            $uid      = unpack('v', substr($data, $i, 2))[1];
            $role     = ord($data[$i + 2]);
            $password = rtrim(substr($data, $i + 3,  8), "\x00");
            $name     = rtrim(substr($data, $i + 11, 24), "\x00");
            $cardno   = unpack('V', substr($data, $i + 35, 4))[1];
            $userId   = rtrim(substr($data, $i + 48, 9), "\x00");
            $users[] = [
                'uid'      => $uid,
                'userId'   => $userId !== '' ? $userId : (string)$uid,
                'name'     => $name,
                'role'     => $role,
                'password' => $password,
                'cardno'   => $cardno,
            ];
            $i += 72;
        }
        return $users;
    }

    public function writeUser(int $uid, string $userId, string $name,
                              int $cardno = 0, string $password = '', int $role = 0): void
    {
        $buf = str_repeat("\x00", 72);
        $buf = substr_replace($buf, pack('v', $uid),                0, 2);
        $buf = substr_replace($buf, chr($role),                     2, 1);
        $buf = substr_replace($buf, substr($password, 0, 8),        3, strlen(substr($password, 0, 8)));
        $buf = substr_replace($buf, substr($name, 0, 24),          11, strlen(substr($name, 0, 24)));
        $buf = substr_replace($buf, pack('V', $cardno),            35, 4);
        $buf = substr_replace($buf, substr((string)$userId, 0, 9), 48, strlen(substr((string)$userId, 0, 9)));
        $res = $this->execCmd(ZKT_CMD_USER_WRQ, $buf);
        if ($res['cmd'] !== ZKT_CMD_ACK_OK) throw new RuntimeException("Write user failed (cmd={$res['cmd']})");
        try { $this->execCmd(ZKT_CMD_REFRESHDATA); } catch (Throwable) {}
    }

    public function deleteUser(int $uid, string $userId): void
    {
        $buf = str_repeat("\x00", 72);
        $buf = substr_replace($buf, pack('v', $uid),                0, 2);
        $buf = substr_replace($buf, substr((string)$userId, 0, 9), 48, strlen(substr((string)$userId, 0, 9)));
        $res = $this->execCmd(ZKT_CMD_DELETE_USER, $buf);
        if ($res['cmd'] !== ZKT_CMD_ACK_OK) throw new RuntimeException("Delete user failed (cmd={$res['cmd']})");
        try { $this->execCmd(ZKT_CMD_REFRESHDATA); } catch (Throwable) {}
    }
}

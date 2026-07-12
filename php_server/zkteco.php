<?php
/**
 * ZKTeco UDP Protocol — PHP Implementation
 * Mirrors the behaviour of node-zklib used in local dev.
 * Compatible with ZK series fingerprint/card terminals (e.g. P1810, F19).
 *
 * Packet format (8-byte header):
 *   [cmd: uint16 LE][checksum: uint16 LE][session_id: uint16 LE][reply_id: uint16 LE][data...]
 */

// ── Command codes (matching node-zklib) ───────────────────────────────────────
define('ZKT_CMD_CONNECT',      1000);
define('ZKT_CMD_DISCONNECT',   1001);
define('ZKT_CMD_ACK_OK',       2000);
define('ZKT_CMD_ACK_ERROR',    2001);
define('ZKT_CMD_PREPARE_DATA', 1500);
define('ZKT_CMD_DATA',         1501);
define('ZKT_CMD_FREE_DATA',    1502);
define('ZKT_CMD_ATT_LOG',        13);   // get attendance records
define('ZKT_CMD_USER_RRQ',        9);   // get users
define('ZKT_CMD_FREE_SIZES',     50);   // get device sizes/counts
define('ZKT_CMD_REFRESHDATA',  1013);
define('ZKT_CMD_USER_WRQ',        8);   // write user
define('ZKT_CMD_DELETE_USER',    18);   // delete user

class ZKTeco
{
    private string $ip;
    private int    $port;
    private int    $timeout;
    /** @var resource|false */
    private $socket     = false;
    private int $session_id = 0;
    private int $reply_id   = 0;

    public function __construct(string $ip, int $port = 4370, int $timeout = 10)
    {
        $this->ip      = $ip;
        $this->port    = $port;
        $this->timeout = $timeout;
    }

    // ── Checksum (identical algorithm to node-zklib createCheckSum) ───────────
    private function calcChecksum(string $buf): int
    {
        $len = strlen($buf);
        $sum = 0;
        $i   = 0;
        while ($len > 1) {
            $sum += unpack('v', substr($buf, $i, 2))[1];
            if ($sum > 0xFFFF) $sum -= 0xFFFF;
            $i += 2; $len -= 2;
        }
        if ($len > 0) $sum += ord($buf[$i]);
        while ($sum > 0xFFFF) $sum -= 0xFFFF;
        return 0xFFFF - $sum;
    }

    // ── Build a command packet ────────────────────────────────────────────────
    private function buildPacket(int $cmd, string $data = ''): string
    {
        $raw = pack('v4', $cmd, 0, $this->session_id, $this->reply_id) . $data;
        $cs  = $this->calcChecksum($raw);
        return pack('v', $cmd)
             . pack('v', $cs)
             . pack('v', $this->session_id)
             . pack('v', $this->reply_id)
             . $data;
    }

    // ── Low-level UDP send ────────────────────────────────────────────────────
    private function udpSend(string $packet): void
    {
        $r = socket_sendto($this->socket, $packet, strlen($packet), 0, $this->ip, $this->port);
        if ($r === false) {
            throw new RuntimeException('UDP send failed: ' . socket_strerror(socket_last_error($this->socket)));
        }
        $this->reply_id = ($this->reply_id + 1) & 0xFFFF;
    }

    // ── Low-level UDP receive ─────────────────────────────────────────────────
    private function udpRecv(int $bufSize = 65536): string
    {
        $buf = ''; $from = ''; $fromPort = 0;
        $len = @socket_recvfrom($this->socket, $buf, $bufSize, 0, $from, $fromPort);
        if ($len === false || $len === 0) {
            throw new RuntimeException('No response from device (timeout or unreachable)');
        }
        return $buf;
    }

    // ── Parse 8-byte response header ─────────────────────────────────────────
    private function parseHeader(string $raw): array
    {
        if (strlen($raw) < 8) throw new RuntimeException('Response too short');
        $h = unpack('vcmd/vcs/vsession/vreply', substr($raw, 0, 8));
        return ['cmd' => (int)$h['cmd'], 'session' => (int)$h['session'], 'data' => substr($raw, 8)];
    }

    // ── Send command and wait for response ────────────────────────────────────
    private function execCmd(int $cmd, string $data = ''): array
    {
        $this->udpSend($this->buildPacket($cmd, $data));
        return $this->parseHeader($this->udpRecv());
    }

    // ── Retrieve a (potentially large) dataset from the device ───────────────
    private function readDataset(int $cmd): string
    {
        // 1. Clear device-side buffer
        try { $this->execCmd(ZKT_CMD_FREE_DATA); } catch (Throwable) {}

        // 2. Request the dataset
        $this->udpSend($this->buildPacket($cmd));
        $raw = $this->udpRecv();
        $res = $this->parseHeader($raw);

        // 3a. Small dataset — device returns data directly
        if ($res['cmd'] === ZKT_CMD_DATA || $res['cmd'] === ZKT_CMD_ACK_OK) {
            return $res['data'];
        }

        // 3b. Large dataset — device signals size then streams DATA packets
        if ($res['cmd'] === ZKT_CMD_PREPARE_DATA) {
            $expected  = strlen($res['data']) >= 4 ? unpack('V', substr($res['data'], 0, 4))[1] : 0;
            $collected = '';
            while (strlen($collected) < $expected) {
                try {
                    $chunk = $this->udpRecv();
                    $cr    = $this->parseHeader($chunk);
                    if ($cr['cmd'] === ZKT_CMD_DATA)      { $collected .= $cr['data']; }
                    elseif ($cr['cmd'] === ZKT_CMD_FREE_DATA) break; // device signals done
                } catch (Throwable) { break; }
            }
            try { $this->execCmd(ZKT_CMD_FREE_DATA); } catch (Throwable) {} // acknowledge end
            return $collected;
        }

        throw new RuntimeException("Unexpected device response cmd={$res['cmd']}");
    }

    // ── Decode ZKTeco proprietary timestamp (matches node-zklib decodeTime) ──
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
        $sock = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
        if ($sock === false) throw new RuntimeException('Cannot create UDP socket — sockets extension may be disabled');
        $this->socket = $sock;

        socket_set_option($this->socket, SOL_SOCKET, SO_RCVTIMEO, ['sec' => $this->timeout, 'usec' => 0]);
        socket_set_option($this->socket, SOL_SOCKET, SO_SNDTIMEO, ['sec' => $this->timeout, 'usec' => 0]);

        $this->session_id = 0;
        $this->reply_id   = 0;

        // Send CONNECT, capture session_id assigned by device
        $this->udpSend($this->buildPacket(ZKT_CMD_CONNECT));
        $raw = $this->udpRecv();
        $res = $this->parseHeader($raw);

        if ($res['cmd'] !== ZKT_CMD_ACK_OK) {
            throw new RuntimeException("Device rejected connection (cmd={$res['cmd']})");
        }
        $this->session_id = $res['session']; // use device-assigned session
    }

    public function disconnect(): void
    {
        if ($this->socket !== false) {
            try { $this->execCmd(ZKT_CMD_DISCONNECT); } catch (Throwable) {}
            socket_close($this->socket);
            $this->socket = false;
        }
    }

    /**
     * Returns device info: userCounts, logCounts, logCapacity.
     */
    public function getInfo(): array
    {
        try {
            $res = $this->execCmd(ZKT_CMD_FREE_SIZES);
            $d   = $res['data'];
            if ($res['cmd'] === ZKT_CMD_ACK_OK && strlen($d) >= 76) {
                return [
                    'userCounts'  => unpack('V', substr($d, 24, 4))[1],
                    'logCounts'   => unpack('V', substr($d, 40, 4))[1],
                    'logCapacity' => unpack('V', substr($d, 72, 4))[1],
                ];
            }
        } catch (Throwable) {}
        return ['userCounts' => null, 'logCounts' => null, 'logCapacity' => null];
    }

    /**
     * Returns attendance records as array of
     * ['uid', 'deviceUserId', 'recordTime' (ISO string)].
     * Record format: 40 bytes each (old firmware format used by P1810).
     */
    public function getAttendances(): array
    {
        $data    = $this->readDataset(ZKT_CMD_ATT_LOG);
        $len     = strlen($data);
        $records = [];
        $i       = 0;

        while ($i + 40 <= $len) {
            $uid    = unpack('v', substr($data, $i,     2))[1];
            $userId = rtrim(substr($data, $i + 2, 9), "\x00");
            // $state = ord($data[$i + 11]);
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

    /**
     * Returns users as array of
     * ['uid', 'userId', 'name', 'role', 'password', 'cardno'].
     * User record format: 72 bytes each.
     */
    public function getUsers(): array
    {
        $data  = $this->readDataset(ZKT_CMD_USER_RRQ);
        $len   = strlen($data);
        $users = [];
        $i     = 0;

        while ($i + 72 <= $len) {
            $uid      = unpack('v', substr($data, $i,      2))[1];
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

    /**
     * Write (create or update) a user on the device.
     */
    public function writeUser(int $uid, string $userId, string $name,
                              int $cardno = 0, string $password = '', int $role = 0): void
    {
        $buf = str_repeat("\x00", 72);
        $buf = substr_replace($buf, pack('v', $uid),                        0,  2);
        $buf = substr_replace($buf, chr($role),                             2,  1);
        $buf = substr_replace($buf, substr($password, 0, 8),                3,  strlen(substr($password, 0, 8)));
        $buf = substr_replace($buf, substr($name,     0, 24),              11,  strlen(substr($name, 0, 24)));
        $buf = substr_replace($buf, pack('V', $cardno),                    35,  4);
        $buf = substr_replace($buf, substr((string)$userId, 0, 9),         48,  strlen(substr((string)$userId, 0, 9)));

        $res = $this->execCmd(ZKT_CMD_USER_WRQ, $buf);
        if ($res['cmd'] !== ZKT_CMD_ACK_OK) throw new RuntimeException("Write user failed (cmd={$res['cmd']})");

        try { $this->execCmd(ZKT_CMD_REFRESHDATA); } catch (Throwable) {}
    }

    /**
     * Delete a user from the device.
     */
    public function deleteUser(int $uid, string $userId): void
    {
        $buf = str_repeat("\x00", 72);
        $buf = substr_replace($buf, pack('v', $uid),                       0,  2);
        $buf = substr_replace($buf, substr((string)$userId, 0, 9),        48,  strlen(substr((string)$userId, 0, 9)));

        $res = $this->execCmd(ZKT_CMD_DELETE_USER, $buf);
        if ($res['cmd'] !== ZKT_CMD_ACK_OK) throw new RuntimeException("Delete user failed (cmd={$res['cmd']})");

        try { $this->execCmd(ZKT_CMD_REFRESHDATA); } catch (Throwable) {}
    }
}

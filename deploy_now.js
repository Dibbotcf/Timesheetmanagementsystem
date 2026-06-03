const ftp = require("basic-ftp");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function deploy() {
    console.log("1. Building React app...");
    execSync("npm run build", { stdio: "inherit" });

    console.log("2. Preparing deployment folder...");
    if (fs.existsSync("deployment")) {
        fs.rmSync("deployment", { recursive: true, force: true });
    }
    fs.mkdirSync("deployment");

    console.log("Copying dist...");
    execSync("xcopy dist deployment /E /I /H /Y");

    console.log("Copying php_server...");
    fs.mkdirSync("deployment/api");
    execSync("xcopy php_server deployment\\api /E /I /H /Y");

    console.log("Creating .env file...");
    const envContent = `VITE_API_URL=https://hrm.tcfbd.com/api
DB_HOST=localhost
DB_USER=tcfbdcom_hrm
DB_PASSWORD=iYC.H5C0rxp&b%Wu
DB_NAME=tcfbdcom_hrm
`;
    fs.writeFileSync("deployment/.env", envContent);

    console.log("3. Uploading via FTP...");
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "b216.serverdiana.com",
            user: "tcfbdcom",
            password: "KJJH*uy^5rt4@y2",
            secure: false
        });

        console.log("Ensuring target directory exists...");
        await client.ensureDir("hrm.tcfbd.com");
        await client.clearWorkingDir(); // Careful: this clears the directory, but it's new so it's fine. 

        console.log("Uploading deployment folder...");
        await client.uploadFromDir("deployment");
        
        console.log("Deployment finished successfully!");
    } catch(err) {
        console.error(err);
    }
    client.close();
}

deploy();

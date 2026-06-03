const ftp = require("basic-ftp")

async function listDir() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        await client.access({
            host: "b216.serverdiana.com",
            user: "tcfbdcom",
            password: "KJJH*uy^5rt4@y2",
            secure: false
        })
        console.log(await client.list())
        
        console.log("Checking public_html...")
        await client.cd("public_html")
        console.log(await client.list())
    }
    catch(err) {
        console.log(err)
    }
    client.close()
}

listDir()

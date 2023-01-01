const express = require('express');
const http = require('http');
const fs = require('fs');
const app = express();
const server = http.createServer(app);

app.set('views', __dirname + '/pages');
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/pages'));
app.use('/docs', express.static(__dirname + '/pages'));
app.use('/docs/images', express.static(__dirname + '/images'));

app.get("/:path(docs)?", (req, res, next) => {
    res.render("index");
});
app.get('/docs/jimp', (_, res) => res.redirect('sharp'));
app.get("/docs/:page", async (req, res, next) => {
    let dirs = await fs.readdirSync("./pages");
    dirs = dirs.filter((f) => f.endsWith(".html")).map((f) => f.split(".")[0]);
    if (!dirs.includes(req.params.page ?? 'index'))
        return res.send("This docs page doesn't exist");
    res.render(req.params.page ?? 'index');
});

server.listen(8080, () => {
    console.info("Docs server now listening");
})
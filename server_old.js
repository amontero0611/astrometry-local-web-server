//server.js
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var path = require('path');
var fs = require('fs');
const fileUpload = require('./lib/index');
const { exec } = require('child_process');

var app = express();

// Variables globales ***

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
//app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//Directorio servicio ficheros estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.all('*html', function(req,res, next) {
    //cualquier intento de acceder a html directamente lleva a /
    res.redirect('/');
});

app.use(fileUpload());

// *************************************************
// ****           RUTAS                          ***
// *************************************************

app.get('/', function(req, res){
  res.render(path.join(__dirname + '/public/index.html'));
  //res.render('index.html');
});


// submit
app.post('/submit', function(req, res) {
  let sampleFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).send('No files were uploaded.');
    return;
  }

  //console.log('req.files >>>', req.files); // eslint-disable-line

  sampleFile = req.files.sampleFile;
  //uploadPath = __dirname + '/upload/' + sampleFile.name;

  var jobID = Date.now().toString();
  uploadPath = __dirname + '/upload/' + jobID;

  sampleFile.mv(uploadPath, function(err) {
    if (err) {
      return res.status(500).send(err);
    }

    //res.status(200).send('File uploaded to ' + uploadPath);
    res.status(200).send(jobID);
    
    execAstrometry(uploadPath);
  
  });
});

app.get('/getresult/:jobID', function(req, res) {
  const file = __dirname + '/output/' + req.params.jobID + '.wcs';
  //console.log('Comprobando ' + file);
  
  fs.access(file, fs.F_OK, (err) => {
    if (err) {
      if(err.code == 'ENOENT'){
        return res.status(201).send('Fichero no accesible');
      }
      return res.status(500).send(err); //error interno
    }
    //console.log('ok');
    //res.status(200).sendFile(file); // Devuelve el fichero para descarga
    
    //Lee contenido del archivo y lo envía como stream
    var stat = fs.statSync(file);
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': stat.size
    });
    var readStream = fs.createReadStream(file);
    readStream.pipe(res);
  });  
});

app.get('/clean', function(req, res) {
  const uploadPath = __dirname + '/upload/';
  const outputPath = __dirname + '/output/';
  //console.log('Comprobando ' + file);
  
  deleteFiles(uploadPath);
  deleteFiles(outputPath);
  res.status(201).send('OK');
  
});

// error handler for unmatched routes 
app.use((req, res, next) => {
  res.status(400).render(path.join(__dirname + '/public/404.html'));
});

///////////////////////////
// Ejecución de Astrometry
///////////////////////////
function execAstrometry(filePath){
  exec("solve-field -D output " + filePath, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
  }); 
}
//////////////////////////
// Borrado de archivos
/////////////////////////
function deleteFiles(path) {
//  let regex = /[.]txt$/;
  fs.readdirSync(path)
//      .filter(f => regex.test(f))
      .map(f => fs.unlinkSync(path + f));
}

//////////////////////////
// Servidor http
/////////////////////////
http.createServer(app).listen(8080, '0.0.0.0', function() {
    console.log('Listo, puerto 8080');
});

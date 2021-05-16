//server.js
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var path = require('path');
var fs = require('fs');
const fileUpload = require('./lib/index');
const { exec } = require('child_process');
const readline = require('readline');
const { resolve } = require('path');

const RED = '\x1b[31m\n';
const GREEN = '\x1b[32m\n';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const YELLOW = "\x1b[33m"
const MAGENTA = "\x1b[35m"


var app = express();

// Globals

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
//app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(fileUpload());

// *************************************************
// ****           ROUTES                          ***
// *************************************************

app.get('/', function (req, res) {
  var welcome = {
    "info":"Astrometry server",
    "message":"See README at GitHub repository",
    "url":"https://github.com/amontero0611/astrometry-local-web-server.git"
  };
  res.setHeader('Content-type', 'application/json'); //Will return JSON
  res.status(200).send(JSON.stringify(welcome));
});

// store parameters for being applied in subsequent solve-field calls
app.post('/setparameters', function (req, res) {

  res.setHeader('Content-type', 'application/json'); //Will return JSON
  //console.log(req.body.parametros);
  fs.writeFile('parms.config', JSON.stringify(req.body), function (err) {
    if (err) {
      res.status(500).send(jsonError("Error storing parameters"));
    } else {
      res.status(200).send(req.body.parametros);
    }
  })
});

// Get parameters
app.get('/getparameters', function (req, res) {

  res.setHeader('Content-type', 'application/json'); //Will return JSON

  fs.readFile('parms.config', (err, data) => {
    if (err) res.status(500).send(jsonError("Error reading parameters"));
    else {
      //let fileContent = JSON.parse(data);
      res.status(200).send(data);
    }
  });

});

// submit
app.post('/submit', function (req, res) {
  let sampleFile;
  let uploadPath;
  //let outputPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).send('No files were uploaded.');
    return;
  }

  sampleFile = req.files.file;  //file uploaded under "file" tag

  var jobID = Date.now().toString();
  uploadPath = __dirname + '/upload/' + jobID;
  outputPath = __dirname + '/output/' + jobID;

  res.setHeader('Content-type', 'application/json');  //Will return JSON

  sampleFile.mv(uploadPath, function (err) {
    if (err) return res.status(500).send(jsonError(err));
  });

  console.log(`${BLUE} *     BEGIN JOB     *${RESET}`);

  // -----> Exec solve-field
  var astroExec = execAstrometry(uploadPath);
  astroExec.then(function (result) {
    // -----> Exec wcsinfo
    var wcsExec = execWcsInfo(outputPath);
    wcsExec.then(function (result) {
      // -----> Parse wcsinfo output to JSON
      var parsExec = parseWcsOutPut(outputPath);
      parsExec.then(function (result) {
        var replyStr = result;
        //-----> Delete job files
        var delJob = deleteFiles(jobID);
        delJob.then(function (result) {
          //All done. Return results
          console.log(`${BLUE} *     END JOB     *${RESET}`);
          res.status(200).send(replyStr);
        }, function (err) { return res.status(500).send(jsonError(err)); });
      }, function (err) { return res.status(500).send(jsonError(err)); });
    }, function (err) { return res.status(500).send(jsonError(err)); });
  }, function (err) { return res.status(500).send(jsonError(err)); });
});

///////////////////////////
// Ejecución de Astrometry
///////////////////////////
function execAstrometry(filePath) {
  var parametros = "";
  console.log(`${YELLOW}* solve-field * ${RESET}`);
  return new Promise(function (resolve, reject) {
    fs.readFile('parms.config', (error, data) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      else {
        let fileContent = JSON.parse(data);
        parametros = fileContent.parametros;
        console.log("solve-field " + parametros + " -D output " + filePath);
        exec("solve-field " + parametros + " -D output " + filePath, (error, stdout, stderr) => {
          if (error) {
            reject(error.message);
          }
          // if (stderr) {reject(stderr); }
          console.log(`stdout: ${stdout}`);
          resolve('OK');
        });
      }
    });
  });
}

///////////////////////////
// Ejecución de wcsinfo
///////////////////////////
function execWcsInfo(filePath) {
  console.log(`${YELLOW}* wcsinfo * ${RESET}`);
  return new Promise(function (resolve, reject) {
    console.log("wcsinfo " + filePath + ".wcs > " + filePath + ".wcsinfo.output");
    exec("wcsinfo " + filePath + ".wcs > " + filePath + ".wcsinfo.output", (error, stdout, stderr) => {
      if (error) {
        reject(error.message);
      }
      //if (stderr) { reject(stderr);  }
      resolve(filePath + ".wcsinfo.output");
    });
  });
}
///////////////////////////////
// Parse wcsinfo output 
///////////////////////////////
function parseWcsOutPut(filePath) {
  console.log(`${YELLOW}* parsing output * ${RESET}`);
  return new Promise(function (resolve) {

    var resultado = "{";

    console.log("parsing " + filePath + ".wcsinfo.output");
    // create instance of readline
    // each instance is associated with single input stream
    let rl = readline.createInterface({
      input: fs.createReadStream(filePath + ".wcsinfo.output")
    });

    let line_no = 0;

    // event is emitted after each line
    rl.on('line', function (line) {
      if (line_no != 0) resultado += ",";
      //console.log(line);
      var words = line.split(" ");
      resultado += "\"" + words[0] + "\":\"" + words[1] + "\"";
      line_no++;

    });

    // end
    rl.on('close', function (line) {
      resultado += "}"
      console.log('Total lines : ' + line_no);
      resolve(resultado); //Done. Returns JSON 
    });

  });
}

//////////////////////////
// Delete files
/////////////////////////
function deleteFiles(jobID) {
  console.log(`${MAGENTA}Delete files ${RESET}` + jobID);
  return new Promise(function (resolve, reject) {
    exec("find . -name \'" + jobID + "*\' -delete", (error, stdout, stderr) => {
      if (error) {
        reject(error.message);
      }
      resolve('OK');
    });
  });
}

/////////////////////////
// make json error msg
/////////////////////////
function jsonError(msg) {
  console.log(`${RED}**** Error **** ${RESET}${msg}`);
  return ("{\"error\":\"" + msg + "\"}");
}

////////////////////////////////////////////
// Create parameters file
///////////////////////////////////////////7
//console.log(req.body.parametros);
fs.writeFile('parms.config', "{\"parametros\":\"\"}", function (err) {
  if (err) {
    console.log(`${RED}Error ${MAGENTA}creando archivo de parámetros ${RESET}`);
    process.exit(500);
  }
});

//////////////////////////////
//  NOT FOUND
app.use(function(req,res){
  res.setHeader('Content-type', 'application/json'); //Will return JSON
  res.status(404).send("{\"error\":\"404 - Not found\"}");
});
//////////////////////////
// Servidor http
/////////////////////////
http.createServer(app).listen(8080, '0.0.0.0', function () {
  console.log(`${YELLOW}--> Ready, ${GREEN}port 8080 ${RESET}`);
});

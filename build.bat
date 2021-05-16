echo off
echo Exec this BAT script from the command line, from inside the directory the Dockerfile and all other stuff are, or it will not work.
echo Si no estes ejecutando este batch desde linea de comandos, y dentro del directorio donde esta el Dockerfile, todo va a funcionar entre muy mal y fatal, mejor pulsa Ctrl+C y sal. Para continuar, pulsa una tecla y cruza los dedos.
pause
echo on
call stop_astrometry
docker rmi astrometry-server
docker build -t astrometry-server .
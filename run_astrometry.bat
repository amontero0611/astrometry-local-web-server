echo off
set HOSTPORT=80
echo Usando puerto %HOSTPORT%.
echo Cambiar la variable HOSTPORT para usar otro puerto TCP.
echo Parando contenedor Astrometry...
call stop_astrometry
echo Arrancando contenedor Astrometry...
echo on
docker run --name astrometry -p %HOSTPORT%:8080 -d astrometry-server
docker ps -a
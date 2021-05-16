# astrometry-local-web-server
Local server for executing Astrometry and getting results in JSON format via HTTP REST calls

Based on Node.js. Needs to be deployed in a linux system with Astrometry installed.

Should you need to use Windows instead, you need to also install Docker, and use the supplied Dockerfile to build a running container image. I also add a windows .bat script to do the docker build.

Provides the following endpoints:

[GET]  /                - info message
[POST] /submit          - Submits a job to the local Astrometry instance. The file to be analyzed has to be uploaded in the call. 
                        This is the curl equivalent command:
                    
                        curl --location --request POST 'http://localhost:8080/submit' \
                         --form 'file=@"/home/nerd/astrometry/123456"'
                    
The job first makes a solve-field command on the uploaded file, and then a wcsinfo command on the generated output.
All temporary files are deleted. And the following is a sample output of the whole job:
                    
                        {
                          "crpix0": "527.184163411",
                          "crpix1": "354.968343099",
                          "crval0": "218.568326666",
                            ...
                            ...
                            ...
                          "merc_diff": "0.109739",
                          "merczoom": "4"
                         }
                     
[POST] /setparameters   - establish the parameters to be used as the solve-field command options. These paramaters are used in all subsequent submitted jobs, until changed
                          or server restart.
                          The call needs to receive the parameters in use in JSON format with this form: {"parametros":" <solve-field options> "}
[GET]  /getparameters   - retrieve the currently solve-field command options to use in coming submitted jobs.

                          

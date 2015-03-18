# Composer

Composer is a single-page application for easy creation and managing of geoserver maps.

## Requirements

Building Composer requires Node be [installed](http://nodejs.org/). In addition to 
installing node and npm it is recommended that `bower` and `grunt-cli` be installed 
globally.

    npm install -g bower
    npm install -g grunt-cli

## Building

To install all project dependencies simply run
    
    npm install

To build all client side assets run
    
    grunt build

## Developing

For development it is most convenient to run the backend and front-end 
separately. 

See [Suite webapp Readme](https://github.com/boundlessgeo/suite/tree/master/geoserver/webapp#developing) for more details on setting up the backend.

After following the build steps above you can run the debug server:

    grunt start

By default the frontend server starts on port 8000. The server will watch for
changes to JavaScript and CSS assets and perform a live reload without having 
to restart the debug server.

### GeoServer Proxy Settings

By default the frontend server will proxy for GeoServer at 
horizon.boundlessgeo.com. To change this create a file named `proxy.json` in the
same directory as `gruntfile.js`. For example:

    {
       "host": "localhost",
       "port": 8080
    }


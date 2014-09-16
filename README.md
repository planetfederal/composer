# GeoServer Web Application

This module contains the GeoServer web application. Building it requires Node
be [installed](http://nodejs.org/). It is comprised of a backend api on the 
Java/GeoServer side, and an angular based client. 

## Developing

For development it is most convenient to run the backend and front-end 
separately. To run the backend import this module into your Java IDE and run
the `Start` class. By default the backend will start up on port 8080. 

The frontend is run (again only for development) via Grunt. Start by building
the frontend:

    grunt build

Once built start the debug server:

    grunt start

By default the frontend server starts on port 8000. The server will watch for
changes to JavaScript and CSS assets and perform a live reload without having 
to restart the debug server.

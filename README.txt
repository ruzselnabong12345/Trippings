2D Lottery with a database

1. Install Node.js 22.13 or newer (nodejs.org).
2. Open a terminal in this folder and run:
     Windows (PowerShell):  $env:ADMIN_PASSWORD="your-password"; node server.js
     Mac / Linux:           ADMIN_PASSWORD=your-password node server.js
3. Open http://localhost:3000
   Results page: http://localhost:3000/#/display
   Admin page:   http://localhost:3000/#/admin

All numbers are saved in the file lottery.db (created next to server.js).
Keep that file safe: it is your database. Back it up by copying it.

To put it online, upload this folder to a host that runs Node.js
(for example Render or Railway) and set ADMIN_PASSWORD there.
Use a host with a persistent disk, or the database file is lost on restart.
GitHub Pages cannot run this, because it only hosts static pages.

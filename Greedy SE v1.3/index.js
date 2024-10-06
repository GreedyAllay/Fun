const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const websitesFolder = path.join(__dirname, 'websites');

// Ensure websites folder exists
if (!fs.existsSync(websitesFolder)) {
  fs.mkdirSync(websitesFolder);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.post('/save', (req, res) => {
  const { code, name, accountToken } = req.body; // Get accountToken from the form
  const websitePath = path.join(websitesFolder, `${name}.html`).toLowerCase();

  // Read the accounts.txt file to check if the accountToken exists
  const accountsFilePath = path.join(__dirname, 'accounts.txt');
  fs.readFile(accountsFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading accounts file:', err);
      return res.status(500).send('Error reading accounts file.');
    }

    try {
      // Parse the string as a JSON array
      const validTokens = JSON.parse(data);

      // Check if the accountToken exists in the array
      if (!validTokens.includes(accountToken)) {
        // Token is not valid, send an error
        return res.status(403).send('<meta http-equiv="refresh" content="10;url=error.html"> <style>body { background-color: black; color: white; font-family: Verdana, Geneva, Tahoma, sans-serif; }</style><h1>Invalid Account Token</h1><hr>Make sure to create an account <a href=loginclient.html>HERE!</a>');
      }

      // If token is valid, proceed with the rest of the logic

      // Check if the website already exists
      if (fs.existsSync(websitePath)) {
        return res.status(400).send('<meta http-equiv="refresh" content="0;url=overwrite.html">');
      }

      // Check if the submitted code contains '.gif'
      if (code.includes('.gif')) {
        const gifWarningPath = path.join(__dirname, 'gifwarning.html');

        // Read the contents of gifwarning.html
        fs.readFile(gifWarningPath, 'utf8', (err, warningData) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Error reading gifwarning.html.');
          }

          // Combine user's code with gifwarning.html content
          const combinedCode = warningData + '\n' + code;

          // Save the combined content
          fs.writeFile(websitePath, combinedCode, (err) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error saving the website.');
            } else {
              res.send('<meta http-equiv="refresh" content="1;url=create.html"> <style>body { background-color: black; color: white; font-family: Verdana, Geneva, Tahoma, sans-serif; }</style><h1> Your website has been flagged to contain GIFs. The users will be notified about this when viewing.</h1> <hr> <h2> Sending you back... </h2>');
            }
          });
        });
      } else {
        // Save the code as usual if no GIF is found
        fs.writeFile(websitePath, code, (err) => {
          if (err) {
            console.error(err);
            res.status(500).send('Error saving the website.');
          } else {
            res.send('<meta http-equiv="refresh" content="1;url=create.html"> <style>body { background-color: black; color: white; font-family: Verdana, Geneva, Tahoma, sans-serif; }</style><h1> Website Saved!</h1> <hr> <h2> Sending you back... </h2>');
          }
        });
      }
    } catch (parseError) {
      console.error('Error parsing accounts file:', parseError);
      return res.status(500).send('Error processing accounts file.');
    }
  });
});


// Handle search functionality
app.get('/search', (req, res) => {
  const searchTerm = req.query.searchTerm.toLowerCase();
  const sortBy = req.query.sortBy || 'newest'; 
  let searchResults = [];

  fs.readdirSync(websitesFolder).forEach((file) => {
    const fileName = path.basename(file, '.html').toLowerCase();
    if (fileName.includes(searchTerm)) {
      const stats = fs.statSync(path.join(websitesFolder, file));
      searchResults.push({ name: fileName, date: stats.birthtime });
    }
  });

  // Sorting based on sortBy
  if (sortBy === 'oldest') {
    searchResults = searchResults.sort((a, b) => a.date - b.date);
  } else if (sortBy === 'newest') {
    searchResults = searchResults.sort((a, b) => b.date - a.date);  // Newest to oldest
  } else if (sortBy === 'alphabetical') {
    searchResults = searchResults.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json({ results: searchResults.map(result => result.name) });
});

// Load a saved HTML page
app.get('/websites/:file', (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(websitesFolder, `${fileName}.html`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('<meta http-equiv="refresh" content="0;url=overwrite.html">');
    } else {
      res.send(data);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

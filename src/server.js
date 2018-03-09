require('dotenv').config();
import https from 'https';
import express from 'express';
import logger from 'morgan';

const app = express();
const port = process.env.PORT || 8000;

const bingImageAPIEndpoint = 'https://api.cognitive.microsoft.com/bing/v7.0/images/search?';
const recentSearch = [];

app.use(logger('dev'));

app.get('/api', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Welcome to the image abstraction layer API',
    recentSearch
  });
});

app.get('/api/:searchQuery', (req, res) => {
  const { searchQuery } = req.params;
  const { offset, count } = req.query;

  if (!searchQuery) {
    return res.status(400).json({
      status: 'Error',
      message: 'Bad request, invalid search term',
    });
  }

  const responseHandler = (response) => {
    let body = '';

    response.on('data', (data) => {
      body += data
    });

    response.on('end', () => {
      const { value } = JSON.parse(body);
      const results = value.map((val) => {
        return {
          url: val.contentUrl,
          thumbnail: val.thumbnailUrl,
          snippet: val.name,
          context: val.hostPageDisplayUrl,
        };
      });
      res.status(200).json(results);
    });

    response.on('error', err => res.status(500).json({
      status: 'Error',
      message: "Error fetching result",
    }));
  };
  
  const reqObject = {
    method: 'get',
    host: 'api.cognitive.microsoft.com',
    path: `/bing/v7.0/images/search?q=${searchQuery}` + (offset ? `&offset=${offset}`: '') + (count ? `&count=${count}`: ``),
    headers : {
      'Ocp-Apim-Subscription-Key' : process.env.API_KEY,
    }
  };

  // Cache recent searches in memory
  recentSearch.push({ term: searchQuery, when: new Date().toISOString() });

  const request = https.request(reqObject, responseHandler);
  request.end();
});

app.listen(port, () => { console.log(`Server listening on port: ${port}`)});

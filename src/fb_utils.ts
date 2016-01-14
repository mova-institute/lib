import * as request from 'request';



////////////////////////////////////////////////////////////////////////////////
export function tokenInfo(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    request({
      uri: 'https://graph.facebook.com/me?access_token=' + token,
      json: true
    }, (error, response, body) => {
      if (error) {
        reject(error);
      }
      else {
        resolve(body);
      }
    });
  })
}
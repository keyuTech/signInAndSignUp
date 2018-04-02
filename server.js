let http = require('http')
let fs = require('fs')
let url = require('url')
let port = process.argv[2]
let sessions = {}

if(!port){
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

let server = http.createServer(function(request, response){
  let parsedUrl = url.parse(request.url, true)
  let pathWithQuery = request.url 
  let queryString = ''
  if(pathWithQuery.indexOf('?') >= 0){ queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
  let path = parsedUrl.pathname
  let query = parsedUrl.query
  let method = request.method

  /******** 从这里开始看，上面不要看 ************/

  if(path === '/'){
    response.statusCode = 200
    let string = fs.readFileSync('./index.html', 'utf8')
    let users = fs.readFileSync('./db/users.json')
    users = JSON.parse(users)
    let cookies = ''
    if(request.headers.cookie){
      cookies = request.headers.cookie.split('; ')
    }
    let hash = {}
    for(let i = 0; i < cookies.length; i++){
      let cookiePart = cookies[i].split('=')
      let key = cookiePart[0]
      let value = cookiePart[1]
      hash[key] = value
    }
    let mySessions = sessions[hash.sessionId]
    let userName
    if(mySessions){
      userName = mySessions.logIn_userName
    }
    let foundUser
    for(let i = 0; i < users.length; i++){
      if(users[i].userName === userName){
        foundUser = users[i]
        break
      }
    }
    if(foundUser){
      string = string.replace('__userName__', foundUser.userName)
    }else{
      string = string.replace('__userName__', '用户名不存在')
    }
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }else if(path === '/signIn' && method === 'GET'){
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write('signIn')
    response.end()
  }else if(path === '/signIn' && method === 'POST'){
    readBody(request).then((body)=>{
      let strings = body.split('&')
      let hash = {}
      strings.forEach((string)=>{
        let parts = string.split('=')
        let key = parts[0]
        let value = parts[1]
        hash[key] = value
      })
      let {userName, password} = hash
      let users = fs.readFileSync('./db/users.json', 'utf8')
      users = JSON.parse(users)
      let foundUser = false
      let foundPassword = false
      for(let i = 0; i < users.length; i++){
        if(users[i].userName === userName && users[i].password === password){
          foundUser = true
          foundPassword = true
        }else if(users[i].userName !== userName && users[i].password === password){
          foundPassword = true
        }else if(users[i].userName === userName && users[i].password !== password){
          foundUser = true
        }
      }
      if(foundUser === true && foundPassword === true){
        let sessionId = Math.random() * 100000
        sessions[sessionId] = {logIn_userName: userName}
        response.setHeader('Set-Cookie', `sessionId = ${sessionId}`)
        response.statusCode = 200
      }else if(foundUser === false){
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.statusCode = 401
        response.write(`{
          "errors": {
            "userName": "invalid"
          }
        }`)
      }else if(foundPassword === false){
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.statusCode = 401
        response.write(`{
          "errors": {
            "password": "invalid"
          }
        }`)
      }
      response.end()
    })
  }else if(path === '/signUp' && method === 'GET'){
    let string = fs.readFileSync('./signUp.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }else if(path === '/signUp' && method === 'POST'){
    readBody(request).then((body)=>{
      let strings = body.split('&')
      let hash = {}
      strings.forEach((string)=>{
        let parts = string.split('=')
        let key = parts[0]
        let value = parts[1]
        hash[key] = value
      })
      let {userName, password, passwordConfirm} = hash
      if(userName.length > 12 || userName.length < 6){
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
          "errors": {
            "userName": "invalid"
          }
        }`)
      }else if(password !== passwordConfirm){
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
          "errors": {
            "password": "invalid"
          }
        }`)
      }else{
        response.statusCode = 200
        let users = fs.readFileSync('./db/users.json', 'utf8')
        users = JSON.parse(users)
        let inUse = false
        for(let i = 0; i < users.length; i++){
          if(users[i].userName === userName){
            inUse = true
            break;
          }
        }
        if(inUse){
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json;charset=utf-8')
          response.write(`{
            "errors": {
              "userName": "inuse"
            }
          }`)
        }else{
          users.push({userName: userName, password: password})
          let usersString = JSON.stringify(users)
          fs.writeFileSync('./db/users.json', usersString)
          response.write('signIn')
        }
      }
      response.end()
    })
  }else{
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write('呜呜呜')
    response.end()
  }

  /******** 代码结束，下面不要看 ************/
})
function readBody(request){
  return new Promise((resolve, reject)=>{
    let body = []
    request.on('data', (chunk)=>{
      body.push(chunk)
    }).on('end', ()=>{
      body = Buffer.concat(body).toString()
      resolve(body)
    })
  })
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)
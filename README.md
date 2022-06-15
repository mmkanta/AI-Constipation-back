# AI-Constipation-back
- install dependencies
   ```
   npm install
   ```
- run the appliaction (server will be running on port 5000)
  ```
  npm start
  ```
- Database: [MongoDB](https://docs.mongodb.com/manual/installation/)
   - Import sample data into database
  ```
  npm run initDB
  ```
**Docker** <br />
1. Go to root directory of all three fl servers
2. Copy `docker-compose.yml` and `.env` into root directory and copy `init-mongo.sh` into mongo volume directory <br />
![image](https://user-images.githubusercontent.com/47110972/159545612-269a81f4-4c47-4624-841f-920c60c8fe84.png) <br />
  docker-compose.yml
  ```
  version: "3.8"
  services:
    webapp-front:
      container_name: webapp-front
      restart: always
      build: ./webapp-front
      ports:
        - '80:3000'
      env_file:
        - ./.env
    webapp-model:
      container_name: webapp-model
      restart: always
      build: ./webapp-model
      ports:
        - '7000:7000'
        - '11112:11112'
      volumes:
        - /webapp-model/resources:/code/resources
      env_file:
        - ./.env
    mongo:
      image: mongo:4.0.3
      container_name: mongo
      ports:
        - '27018:27017' # host_port:container_port
      environment:
        MONGO_INITDB_ROOT_USERNAME: $ROOT_USER
        MONGO_INITDB_ROOT_PASSWORD: $ROOT_PASSWORD
      volumes:
        - /mongo-test/migrations:/docker-entrypoint-initdb.d # path to init-mongo.sh
        - /mongo-test/db:/data/db # can be anywhere
      env_file:
        - ./.env
    webapp-back:
      container_name: webapp-back
      restart: always
      build: ./webapp-back
      ports:
        - '5000:5000'
      volumes:
        - /webapp-back/resources:/usr/src/app/resources
      env_file:
        - ./.env
  ```
  init-mongo.sh
  ```
  set -e
  mongo <<EOF
  use aiweb
  db.createUser({
    user: '$WEB_DB_USER',
    pwd: '$DB_PASSWORD',
    roles: [{
      role: 'readWrite',
      db: 'aiweb'
    }]
  })
  EOF
  ```
  .env
  ```
   # DATABASE URL
   # DB_URL=mongodb://<user>:<password>@localhost:27018/aiweb?authSource=aiweb&w=1
   DB_URL=mongodb://<user>:<password>@mongo:27017/aiweb?authSource=aiweb&w=1

   # ROOT DATABASE USERNAME/PASSWORD
   ROOT_USER=<root>
   ROOT_PASSWORD=<password>

   # USER DATABASE USERNAME/PASSWORD
   DB_USER=<user>
   DB_PASSWORD=<password>

   # SECRET ## 
   SECRET_TOKEN=SECRET

   # BACKEND
   PY_SERVER=http://webapp-model:7000

3. Build docker compose. Frontend, backend, and model will be run at port 80, 5000, and 7000
   ```
   docker-compose up -d --build
   ```
   or
   ```
   docker-compose up -d
   ```
4. Import sample data into the containers
   ```
   docker exec -it webapp-back bash
   ```
   ```
   npm run initDB
   ```
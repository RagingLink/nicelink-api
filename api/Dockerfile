FROM node:17 as run

WORKDIR /usr/src/app
# Copy over files I don't like to copy over all files but having tons of COPY statements 
# and to have to update them whenever I want to add something non-js is tedious
COPY . . 

# Install dependencies
RUN yarn install --prod
# Is this even necessary with docker-compose `ports:`?
EXPOSE 8081
# Entrypoint
CMD ["yarn", "run", "start"]
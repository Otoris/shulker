# Use Node.js v20 as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY config.json ./

# Install dependencies
RUN npm install
RUN npm install typescript@latest @types/ws@latest


# Bundle app source
COPY . .

RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the app
CMD [ "npm", "start" ]

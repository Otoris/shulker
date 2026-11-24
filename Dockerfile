# Use Node.js v22 as the base image
FROM node:22

# Set the working directory in the container
# WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install


# Bundle app source
COPY . .

RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the app
CMD [ "npm", "start" ]

#!/bin/bash

# Setup script for authentication dependencies
# Run this after implementing the authentication system

echo "Installing authentication dependencies for GTSD mobile app..."

# Navigate to mobile app directory
cd "$(dirname "$0")/.." || exit

# Install required npm packages
echo "Installing NPM packages..."
npm install --save \
  react-native-keychain \
  @react-native-community/netinfo \
  react-native-config

# Install dev dependencies for testing
echo "Installing dev dependencies..."
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/react-hooks

# Pod install for iOS (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing iOS pods..."
  cd ios && pod install
  cd ..
fi

echo "Creating .env file from example..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env file created. Please update it with your configuration."
else
  echo ".env file already exists."
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your API configuration"
echo "2. Implement backend auth endpoints (see docs/AUTHENTICATION.md)"
echo "3. Run 'npm test' to verify authentication tests pass"
echo "4. For iOS: Open Xcode and enable Keychain Sharing capability"
echo "5. For Android: No additional setup required"
echo ""
echo "To run the app:"
echo "  iOS: npm run ios"
echo "  Android: npm run android"
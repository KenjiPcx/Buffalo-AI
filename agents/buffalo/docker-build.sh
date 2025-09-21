#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
IMAGE_NAME="buffalo-agent"
TAG="latest"
BUILD_ARGS=""
PUSH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --no-cache)
            BUILD_ARGS="$BUILD_ARGS --no-cache"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -t, --tag TAG      Set image tag (default: latest)"
            echo "  -n, --name NAME    Set image name (default: buffalo-agent)"
            echo "  --push             Push image to registry after build"
            echo "  --no-cache         Build without cache"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

print_status "Building Buffalo Docker image..."
print_status "Image name: $FULL_IMAGE_NAME"

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f "env.example" ]; then
    print_warning "No .env or env.example file found. Make sure to set environment variables when running the container."
fi

# Build the Docker image
print_status "Running docker build..."
if docker build $BUILD_ARGS -t "$FULL_IMAGE_NAME" .; then
    print_status "✅ Build completed successfully!"
    
    # Show image size
    IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME" --format "table {{.Size}}" | tail -n 1)
    print_status "Image size: $IMAGE_SIZE"
    
    # Push if requested
    if [ "$PUSH" = true ]; then
        print_status "Pushing image to registry..."
        docker push "$FULL_IMAGE_NAME"
        print_status "✅ Push completed!"
    fi
    
    echo ""
    print_status "To run the container:"
    echo "  docker run --env-file .env --shm-size=2g --security-opt seccomp:unconfined $FULL_IMAGE_NAME"
    echo ""
    print_status "Or use docker-compose:"
    echo "  docker-compose up"
    
else
    print_error "❌ Build failed!"
    exit 1
fi

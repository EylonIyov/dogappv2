# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create .env file with your production environment variables"
    echo "Use .env.template as a template:"
    echo "cp .env.template .env"
    echo "Then edit .env with your actual values"
    exit 1
fi
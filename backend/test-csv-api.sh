#!/bin/bash

# CSV Upload API Test Script
# This script provides manual testing commands for the CSV upload API

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ENDPOINT="${API_BASE_URL}/ingestion/csv-upload"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to create a test CSV file
create_test_csv() {
    local filename=$1
    local rows=${2:-10}

    print_info "Creating test CSV file: $filename with $rows rows"

    echo "id,name,email,age,department,salary" > "$filename"
    for i in $(seq 1 $rows); do
        echo "$i,Employee$i,employee$i@company.com,$((20 + i % 40)),Dept$((i % 5)),\$$(( 50000 + i * 1000 ))" >> "$filename"
    done

    print_success "Test CSV file created: $filename"
}

# Function to upload CSV file
upload_csv() {
    local filepath=$1

    if [ ! -f "$filepath" ]; then
        print_error "File not found: $filepath"
        return 1
    fi

    print_info "Uploading CSV file: $filepath to $ENDPOINT"
    echo ""

    response=$(curl -w "\n%{http_code}" -s -X POST "$ENDPOINT" \
        -F "file=@$filepath" \
        -H "Accept: application/json")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo ""
    print_info "HTTP Status Code: $http_code"
    echo ""

    if [ "$http_code" -eq 201 ]; then
        print_success "Upload successful!"
        echo ""
        print_info "Response:"
        echo "$body" | jq '.' || echo "$body"

        # Extract job ID and data source ID if jq is available
        if command -v jq &> /dev/null; then
            job_id=$(echo "$body" | jq -r '.job.id // empty')
            data_source_id=$(echo "$body" | jq -r '.dataSource.id // empty')

            if [ -n "$job_id" ]; then
                echo ""
                print_success "Job ID: $job_id"
                print_info "Check job status: curl $API_BASE_URL/ingestion/jobs/$data_source_id"
                print_info "Get processed data: curl $API_BASE_URL/ingestion/processed-data/$job_id"
            fi
        fi
    else
        print_error "Upload failed!"
        echo ""
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    echo ""
}

# Function to get all data sources
get_data_sources() {
    print_info "Fetching all data sources from $API_BASE_URL/ingestion/data-sources"
    echo ""

    response=$(curl -s -X GET "$API_BASE_URL/ingestion/data-sources" \
        -H "Accept: application/json")

    echo "$response" | jq '.' || echo "$response"
    echo ""
}

# Function to get jobs for a data source
get_jobs() {
    local source_id=$1

    if [ -z "$source_id" ]; then
        print_error "Data source ID required"
        echo "Usage: $0 get-jobs <source_id>"
        return 1
    fi

    print_info "Fetching jobs for data source $source_id"
    echo ""

    response=$(curl -s -X GET "$API_BASE_URL/ingestion/jobs/$source_id" \
        -H "Accept: application/json")

    echo "$response" | jq '.' || echo "$response"
    echo ""
}

# Function to get processed data
get_processed_data() {
    local job_id=$1
    local page=${2:-1}
    local limit=${3:-50}

    if [ -z "$job_id" ]; then
        print_error "Job ID required"
        echo "Usage: $0 get-data <job_id> [page] [limit]"
        return 1
    fi

    print_info "Fetching processed data for job $job_id (page: $page, limit: $limit)"
    echo ""

    response=$(curl -s -X GET "$API_BASE_URL/ingestion/processed-data/$job_id?page=$page&limit=$limit" \
        -H "Accept: application/json")

    echo "$response" | jq '.' || echo "$response"
    echo ""
}

# Function to download original file
download_file() {
    local job_id=$1
    local output_file=${2:-"downloaded_${job_id}.csv"}

    if [ -z "$job_id" ]; then
        print_error "Job ID required"
        echo "Usage: $0 download <job_id> [output_file]"
        return 1
    fi

    print_info "Downloading original file for job $job_id"

    curl -s -X GET "$API_BASE_URL/ingestion/download/$job_id" \
        -o "$output_file"

    if [ -f "$output_file" ]; then
        print_success "File downloaded: $output_file"
        print_info "File size: $(wc -c < "$output_file") bytes"
    else
        print_error "Download failed"
    fi

    echo ""
}

# Main script logic
case "${1:-help}" in
    "create-test")
        filename="${2:-test_data.csv}"
        rows="${3:-10}"
        create_test_csv "$filename" "$rows"
        ;;

    "upload")
        if [ -z "$2" ]; then
            print_error "File path required"
            echo "Usage: $0 upload <filepath>"
            exit 1
        fi
        upload_csv "$2"
        ;;

    "quick-test")
        print_info "Running quick test: create and upload CSV"
        test_file="/tmp/quick_test_$(date +%s).csv"
        create_test_csv "$test_file" 5
        upload_csv "$test_file"
        rm -f "$test_file"
        print_info "Cleaned up test file"
        ;;

    "list-sources")
        get_data_sources
        ;;

    "get-jobs")
        get_jobs "$2"
        ;;

    "get-data")
        get_processed_data "$2" "$3" "$4"
        ;;

    "download")
        download_file "$2" "$3"
        ;;

    "help"|*)
        echo "CSV Upload API Test Script"
        echo ""
        echo "Usage: $0 <command> [arguments]"
        echo ""
        echo "Commands:"
        echo "  create-test [filename] [rows]  - Create a test CSV file (default: test_data.csv, 10 rows)"
        echo "  upload <filepath>              - Upload a CSV file to the API"
        echo "  quick-test                     - Create and upload a small test CSV file"
        echo "  list-sources                   - List all data sources"
        echo "  get-jobs <source_id>           - Get jobs for a specific data source"
        echo "  get-data <job_id> [page] [limit] - Get processed data for a job"
        echo "  download <job_id> [output]     - Download original file for a job"
        echo "  help                           - Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  API_BASE_URL - Base URL for the API (default: http://localhost:3000)"
        echo ""
        echo "Examples:"
        echo "  # Create a test CSV with 100 rows"
        echo "  $0 create-test employees.csv 100"
        echo ""
        echo "  # Upload a CSV file"
        echo "  $0 upload employees.csv"
        echo ""
        echo "  # Quick test (create and upload)"
        echo "  $0 quick-test"
        echo ""
        echo "  # List all data sources"
        echo "  $0 list-sources"
        echo ""
        echo "  # Get jobs for data source ID 1"
        echo "  $0 get-jobs 1"
        echo ""
        echo "  # Get processed data for job ID 5"
        echo "  $0 get-data 5"
        echo ""
        echo "  # Download original file for job ID 5"
        echo "  $0 download 5 original.csv"
        echo ""
        ;;
esac

exit 0

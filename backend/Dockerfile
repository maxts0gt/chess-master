# Use Rust 1.79 which should be compatible with our dependencies
FROM rust:1.79-slim-bullseye as builder

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src
COPY migrations ./migrations

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/chess-app /app/chess-app
COPY --from=builder /app/migrations /app/migrations

# Create database directory
RUN mkdir -p /app/data

# Set environment variables
ENV DATABASE_URL=sqlite:///app/data/chess.db
ENV RUST_LOG=info

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./chess-app"]
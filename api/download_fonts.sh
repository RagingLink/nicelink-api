#!/bin/bash
if [ ! -d "./tmp" ]; then
    mkdir ./tmp
fi

if [ ! -f "./tmp/main.tar.gz" ]; then
    echo "Downloading the fonts..."
    curl -L https://github.com/google/fonts/archive/main.tar.gz -o ./tmp/main.tar.gz
    mkdir -p ./tmp/goog-fonts/fonts
else
    echo "Skipping download, existing main.tar.gz file"
fi

echo "Extracting the fonts"
tar -zxf ./tmp/main.tar.gz -C ./tmp/goog-fonts/fonts
if [ ! -d "./assets/fonts/google" ]; then
    mkdir ./assets/fonts/google
fi

echo "Moving fonts"
if [ -d "./assets/fonts/google/ofl" ]; then
    echo "Re-moving ofl"
    rm -R ./assets/fonts/google/ofl
fi
if [ -d "./assets/fonts/google/ufl" ]; then
    echo "Re-moving ufl"
    rm -R ./assets/fonts/google/ufl
fi

mv ./tmp/goog-fonts/fonts/fonts-main/ofl ./assets/fonts/google
mv ./tmp/goog-fonts/fonts/fonts-main/ufl ./assets/fonts/google

echo "Cleaning up"
rm -R ./tmp
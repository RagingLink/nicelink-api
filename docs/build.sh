#!/bin/bash
docker run --rm --name slate -v $(pwd)/pages:/srv/slate/build -v $(pwd)/source:/srv/slate/source slatedocs/slate build

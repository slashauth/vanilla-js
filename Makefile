COMMIT := $(shell git rev-parse --short HEAD)
DATE := $(shell git log -1 --format=%cd --date=format:"%Y%m%d")
VERSION := $(DATE)-$(COMMIT)
ifneq ($(shell git status --porcelain),)
	VERSION := $(VERSION)-dirty
endif
CURRENT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
PROD_BRANCH := production
PORCELAIN_STATUS := $(shell git status --porcelain)

PROD_BUCKET_NAME := slashauth-static-webpages
PROD_FOLDER_NAME := prod-libs/vanilla-js

.PHONY: install
install:
	npm install

.PHONY: build-prod
build-prod: install
	# Deploying to prod can only be done on the production branch, and only when no local changes exist!
	if [ ${CURRENT_BRANCH} != ${PROD_BRANCH} ]; then\
		echo YOU CAN ONLY DEPLOY TO PRODUCTION FROM THE `production` BRANCH;\
		exit 1;\
	fi
	if [[ ! -z "${PORCELAIN_STATUS}" ]]; then\
		echo Refusing to deploy dirty changes to prod;\
		exit 1;\
	fi
	rm -rf build/
	npm build
	./compress-files.sh

.PHONY: push-prod
push-prod: build-prod
	aws s3 sync build s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} --delete --cache-control max-age=31536000,public --region=us-west-2 --profile=debrief --exclude "static/*"
	aws s3 sync build s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} --delete --cache-control max-age=31536000,public --region=us-west-2 --profile=debrief --exclude "*" --include static/css/* --content-encoding gzip
	aws s3 sync build s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} --delete --cache-control max-age=31536000,public --region=us-west-2 --profile=debrief --exclude "*" --include static/js/* --content-encoding gzip

.PHONY: deploy-prod
deploy-prod: push-prod
	aws s3 --recursive mv s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/latest s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/latest-backup-${DATE} --region us-west-2 --profile debrief
	aws s3 sync s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/latest --region us-west-2 --profile debrief --delete

COMMIT := $(shell git rev-parse --short HEAD)
DATE := $(shell git log -1 --format=%cd --date=format:"%Y%m%d")
VERSION := $(DATE)-$(COMMIT)
ifneq ($(shell git status --porcelain),)
	VERSION := $(VERSION)-dirty
endif
CURRENT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
PROD_BRANCH := production
PORCELAIN_STATUS := $(shell git status --porcelain)

VERSION=$(shell node -pe "require('./package.json').version")

PROD_BUCKET_NAME := slashauth-static-webpages
PROD_FOLDER_NAME := prod-libs/vanilla-js

.PHONY: install
install:
	npm install

.PHONY: build-prod
build-prod: install
	if [[ ! -z "${PORCELAIN_STATUS}" ]]; then\
		echo Refusing to deploy dirty changes to prod;\
		exit 1;\
	fi
	rm -rf build/
	npm run build
	./compress-files.sh

.PHONY: push-prod
push-prod: build-prod
	if [ -z "`aws s3 ls s3://slashauth-static-webpages/prod-libs/vanilla-js/${VERSION}`" ]; then\
		aws s3 sync build/static/js s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} --delete --cache-control max-age=31536000,public --region=us-west-2 --profile=debrief --content-encoding gzip;\
	else\
		echo This version has already been deployed. Updated versions are required to deploy.\
		exit 1;\
	fi

define release
    NEXT_VERSION=`node -pe "require('semver').inc(\"${VERSION}\", '$(1)')"` && \
    node -e "\
        var j = require('./package.json');\
        j.version = \"$$NEXT_VERSION\";\
        var s = JSON.stringify(j, null, 2);\
        require('fs').writeFileSync('./package.json', s);"
   	git commit -m "Version $$NEXT_VERSION" -- package.json && \
    git tag "$$NEXT_VERSION" -m "Version $$NEXT_VERSION"
endef

.PHONY: release-patch
release-patch:
	@$(call release,patch)

release-minor:
	@$(call release,minor)

release-major:
	@$(call release,major)

.PHONY: deploy-prod
deploy-prod: push-prod
	aws s3 sync s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} s3://${PROD_BUCKET_NAME}/${PROD_FOLDER_NAME}/${VERSION} --region us-west-2 --profile debrief --delete
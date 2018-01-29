.DEFAULT_GOAL := help
.PHONY:

install: ## Install build project dependencies
	yarn install

build: install ## Build project for production
	node_modules/.bin/encore production

watch: install ## Build project for dev
	node_modules/.bin/encore dev --watch

### Help
help:
	@echo "\n\033[1mUSAGE\033[0m\n\tmake [TARGET]\n"
	@echo "\033[1mAVAILABLE TARGETS\033[0m"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\t\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo "\n"

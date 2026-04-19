APP_NAME    := pico-academy
INSTALL_DIR := /var/www/html/kush
SERVICE     := kush.service
PORT        := 3050
NODE_DIR    := $(dir $(shell which node))
SUDO_NODE   := sudo env "PATH=$(NODE_DIR):$$PATH"

.PHONY: install build deps clean enable start stop restart status uninstall

deps:
	cd pico-academy && npm install

build: deps
	cd pico-academy && npm run build

install: build
	sudo mkdir -p $(INSTALL_DIR)
	sudo rsync -a --delete \
		--exclude='node_modules' \
		pico-academy/ $(INSTALL_DIR)/
	cd $(INSTALL_DIR) && $(SUDO_NODE) npm install --omit=dev
	sudo cp kush.service /etc/systemd/system/$(SERVICE)
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE)
	sudo systemctl restart $(SERVICE)
	@echo "Installed to $(INSTALL_DIR) and enabled $(SERVICE) on port $(PORT)"

enable:
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE)

start:
	sudo systemctl start $(SERVICE)

stop:
	sudo systemctl stop $(SERVICE)

restart:
	sudo systemctl restart $(SERVICE)

status:
	sudo systemctl status $(SERVICE)

uninstall:
	sudo systemctl stop $(SERVICE) || true
	sudo systemctl disable $(SERVICE) || true
	sudo rm -f /etc/systemd/system/$(SERVICE)
	sudo systemctl daemon-reload
	@echo "Service removed. $(INSTALL_DIR) left intact."

clean:
	cd pico-academy && rm -rf .next node_modules

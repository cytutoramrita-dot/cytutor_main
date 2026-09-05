IMAGES = cytutor/bookmarklet \
         cytutor/dos1 \
         cytutor/hidden-pages \
         cytutor/path-traversal \
         cytutor/power-cookie \
         cytutor/old_system \
         cytutor/ssti \
         cytutor/python_compiler \
         cytutor/git_challenge \
         cytutor/secret
         cytutor/innocent-zip \
         cytutor/deleted-not-gone \
         cytutor/logfile-challenge \
         cytutor/jwt \
         cytutor/ssrf \
         cytutor/ref-xss
		 

pull:
	@for img in $(IMAGES); do \
		echo "Pulling $$img..."; \
		docker pull $$img || echo "$$img not found"; \
	done

list:
	docker images | grep cytutor

clean:
	docker images --format "{{.Repository}}:{{.Tag}}" | grep cytutor | xargs -r docker rmi -f

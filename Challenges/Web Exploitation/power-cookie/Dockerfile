FROM php:8.2-apache

# Copy project into Apache web root
COPY . /var/www/html

# Permissions (optional but clean)
RUN chown -R www-data:www-data /var/www/html

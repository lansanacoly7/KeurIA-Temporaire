"""Le site web d'une école devient un lien cliquable : seules les adresses http(s) valides sont acceptées."""
from rest_framework import status
from rest_framework.test import APITestCase

from .helpers import build_school

THEME = {'name': 'Mon école', 'city': 'Dakar', 'primaryColor': '#0b3a5b', 'accentColor': '#7fd3f0'}


class SchoolWebsiteTests(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.client.force_login(self.data['admin'])

    def save(self, website):
        return self.client.patch('/api/ecole/school', {**THEME, 'website': website}, format='json')

    def test_http_and_https_addresses_are_kept(self):
        for url in ('https://ecole.sn', 'http://www.ecole.sn/accueil?x=1'):
            response = self.save(url)

            self.assertEqual(response.status_code, status.HTTP_200_OK, url)
            self.assertEqual(response.data['website'], url)

    def test_dangerous_or_malformed_addresses_are_refused(self):
        for url in ('javascript:alert(1)', 'data:text/html,<script>1</script>', 'ftp://ecole.sn', 'ecole.sn', 'https://', 12, ['x']):
            response = self.save(url)

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, repr(url))

    def test_an_empty_address_clears_the_site(self):
        self.save('https://ecole.sn')

        response = self.save('')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['website'], '')

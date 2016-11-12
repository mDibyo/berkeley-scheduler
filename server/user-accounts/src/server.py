#!/user/bin/env python3

from pymongo import MongoClient
from tornado.ioloop import IOLoop
from tornado.httpserver import HTTPServer
from tornado.web import Application, RequestHandler


DATABASE = 'berkeley-scheduler'
COLLECTION = 'users'


def get_collection():
    client = MongoClient()
    return client[DATABASE][COLLECTION]


class UserAddHandler(RequestHandler):
    def post(self):
        first_name = self.get_argument('first_name', None)
        last_name = self.get_argument('last_name', None)
        email = self.get_argument('email', None)
        if not first_name or not email:
            self.set_status(400, 'Did not send first name and email')
            return

        users = get_collection()
        users.insert_one({
            'first_name': first_name,
            'last_name': last_name,
            'email': email
        })
        self.set_status(200)


if __name__ == '__main__':
    import sys
    port = sys.argv[1] if len(sys.argv) >= 2 else 443  # HTTPS

    app = Application([
        (r'/user/add', UserAddHandler)
    ])

    http_server = HTTPServer(app)
    http_server.listen(port)
    print('Server listening on port {}'.format(port))
    IOLoop.current().start()

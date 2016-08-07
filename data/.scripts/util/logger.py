#!/usr/bin/env python3


from collections import defaultdict
import json
import os.path as path


class Logger(object):
    def __init__(self, log_file, append=True):
        self._log = defaultdict(list)
        self.log_file = log_file

        assert path.exists(path.dirname(self.log_file))

        if append:
            if path.exists(self.log_file):
                with open(self.log_file, 'r') as f:
                    self._log.update(json.load(f))

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.flush()

    def log(self, tag, message):
        self._log[tag].append(message)

    def flush(self):
        with open(self.log_file, 'w') as f:
            json.dump(self._log, f)

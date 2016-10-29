# Berkeley Scheduler

Code for [berkeleyscheduler.com](https://berkeleyscheduler.com), a class
schedule planner for UC Berkeley students.


### Reporting issues

You can report bugs and suggest features on the
[issues](https://github.com/mDibyo/berkeley-scheduler/issues)
page. Before adding a new issue, check if the issue has already been added.
If so, please comment on the existing issue, instead of creating a new one.
This will help us a lot in addressing issues.


### Contributing

To contribute, take a look at [CONTRIBUTING.md](CONTRIBUTING.md).


### Setting up the project


#### Running the website locally

Berkeley Scheduler is a static website. All its functionality is handled
in the frontend (on the AngularJS framework). In order to allow the
website to be hosted on Github, all compiled resources used by the
website must be precompiled and stored alongside the source code.
Therefore, running the website locally is as simple as cloning the
project and serving it from the filesystem with a static pages server
such as python's SimpleHTTPServer.

1. Clone the project.
2. Start up the static pages server from the root of the cloned project
directory with `python -m SimpleHTTPServer 8421`.
3. Visit the website at [http://localhost:8421](http://localhost:8421).


#### Developing on the frontend

As mentioned above, all work on the website is done in Javascript. The
code is dependent on a number of libraries available through

1. [Install node and npm](https://docs.npmjs.com/getting-started/installing-node).
1. Install all dependencies by running `npm install` in the project
directory.
1. To see changes reflected on the website, run `gulp` in the project
directory. This compiles all svg and js sources and stores them in their
final location.
1. Before committing, run `gulp release`, which in addition to compiling
svg and js resources, minifies and uglifies the js resources.


#### Developing on the data pipeline

The class enrollment data on Berkeley Scheduler is obtained from the
Student Information Systems (SIS) APIs. The data pipeline (/data) is
responsible for fetching and updating this data. It is currently run
manually once a day.

An APP_ID and APP_KEY are required for accessing the API. SIS has
approved Berkeley Scheduler's request to access the API, and has issued
us APP_ID, APP_KEY pairs for the APIs. Any resource requests made to the
API for use on Berkeley Scheduler must use these specific pairs. To work
on the data pipeline, send an email to berkeley-scheduler@berkeley.edu
stating what you would be using the API for. On receiving the APP_ID and
APP_KEY, copy the `server/.credentials.tmpl` folder to the
`server/.credentials` folder and set the environment variables in the
`server/.credentials/sis_api.sh` file.

Note that access to the APIs is not required for working on the frontend
since a set of enrollment data has already been fetched and stored in
data/final.

Run the pipeline by running `./run.sh` inside the /data directory. The
daily runs skip a number of steps, so when running for the first time,
set `daily` to `false` in `./run.sh`.

Note, the `finalize` step in `./run.sh`. This step copies over the
processed output from the data/intermediate directory to the data/final
directory. Before doing that, it copies the old output in data/final to
data/recover. If something goes wrong, and you only realize it after
`finalize` has completed, run `./recover.sh` to restore the old output.


### Acknowledgements

I would like to thank everyone who has contributed to the development
of this project, for providing feedback and brainstorming ideas with me.

There are however a few people who have contributed a lot to this
project, and I would like to acknowledge them. Mihir Patil,
Revati Kapshikhar, Tiffany Qi and Viraj Mahesh: thanks a lot for all the
support, the feedback, the help you guys provided to me. Without you
guys, this would not have happened.

#!/usr/bin/env bash

kubectl create -f kubernetes/credentials-volume.yaml
kubectl create -f kubernetes/credentials-volume-claim.yaml

kubectl create -f kubernetes-config/update-enrollment-data-scheduled-job.yaml

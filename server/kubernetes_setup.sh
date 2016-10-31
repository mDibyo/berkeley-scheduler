#!/usr/bin/env bash

kubectl create -f kubernetes-config/credentials-volume.yaml
kubectl create -f kubernetes-config/credentials-volume-claim.yaml

kubectl create -f kubernetes-config/pod.yaml

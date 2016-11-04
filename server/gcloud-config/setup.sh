#!/usr/bin/env bash

CWD=$(pwd)
PROJECT_DIR=$(cd $(dirname ${BASH_SOURCE[0]})/../.. && pwd )

ZONE_NAME=us_west1-a
ENROLLMENT_DATA_DISK_NAME=enrollment-data-pd
INSTANCE_NAME=berkeley-scheduler-instance

gcloud compute disks create ${ENROLLMENT_DATA_DISK_NAME} \
  --zone=${ZONE_NAME} \
  --size=10GB \
  --type=pd-standard || exit 1

gcloud compute instances create ${INSTANCE_NAME} \
  --zone=${ZONE_NAME} \
  --image-family=debian-8 \
  --image-project=debian-cloud || exit 1
gcloud compute instances attach-disk ${INSTANCE_NAME} \
  --zone=${ZONE_NAME} \
  --disk ${ENROLLMENT_DATA_DISK_NAME} || exit 1

gcloud compute ssh ${INSTANCE_NAME} \
  --zone=${ZONE_NAME} \
  -- " \
    sudo mkfs.ext4 -F -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/disk/by-id/google-persistent-disk-1 \
      && sudo mkdir -p /mnt/disks/enrollment-data \
      && sudo mount -o discard,defaults /dev/disk/by-id/google-persistent-disk-1 /mnt/disks/enrollment-data \
      && sudo chmod a+w /mnt/disks/enrollment-data \
      && echo UUID=$(sudo blkid -s UUID -o value /dev/disk/by-id/google-persistent-disk-1) /mnt/disks/enrollment-data ext4 discard,defaults,[NOFAIL] 0 2 | sudo tee -a /etc/fstab \
    " \
    || exit 1

CWD=$(pwd) cd ${PROJECT_DIR}/.. \
  && sudo tar -czvf schedule-builder.tar.gz schedule-builder \
  && gcloud compute copy-files schedule-builder.tar.xz ${INSTANCE_NAME}:/mnt/disks/enrollment-data \
  && gcloud compute ssh ${INSTANCE_NAME} \
  --zone=${ZONE_NAME} \
  -- " \
    cd /mnt/disks/enrollment-data \
    && tar -xzvf schedule-builder.tar.xz \
  " \
  || exit 1

./kubernetes_setup.sh

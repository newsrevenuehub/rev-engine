FROM google/cloud-sdk:414.0.0-alpine

EXPOSE 8085

VOLUME /data

ENTRYPOINT ["gcloud", "beta", "emulators", "pubsub"]
CMD ["start", "--host-port=0.0.0.0:8085", "--data-dir=/data", "--project=revenue-engine" ]

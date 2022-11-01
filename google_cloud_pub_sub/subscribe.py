# this is a helpful script to connect to topic from the Django shell
import os

from google.cloud import pubsub_v1


topic_name = "projects/{project_id}/topics/{topic}".format(
    project_id=os.getenv("GOOGLE_CLOUD_PROJECT"), topic=os.getenv("NEW_USER_TOPIC")
)

subscription_name = "projects/{project_id}/subscriptions/{sub}".format(
    project_id=os.getenv("GOOGLE_CLOUD_PROJECT"),
    sub="TEST",
)

try:
    pubsub_v1.SubscriberClient().delete_subscription(request={"subscription": subscription_name})
except:  # noqa
    print("Subscription did not exist prior; will continue")


def callback(message):
    print(message.data)
    message.ack()


with pubsub_v1.SubscriberClient() as subscriber:
    subscriber.create_subscription(name=subscription_name, topic=topic_name)
    future = subscriber.subscribe(subscription_name, callback)
    future.result()

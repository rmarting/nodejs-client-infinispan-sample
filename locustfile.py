import logging
from locust import HttpUser, task, events

class publishEvents(HttpUser):
  @task
  def callServicePut(self):
    self.client.get("/", 
        headers={'accept': 'application/json', 'Content-Type': 'application/json'}
    )

@events.quitting.add_listener
def _(environment, **kw):
  if environment.stats.total.fail_ratio > 0.01:
      logging.error("Test failed due to failure ratio > 1%")
      environment.process_exit_code = 1
  elif environment.stats.total.avg_response_time > 100:
      logging.error("Test failed due to average response time ratio > 100 ms")
      environment.process_exit_code = 1
  elif environment.stats.total.get_response_time_percentile(0.95) > 200:
      logging.error("Test failed due to 95th percentile response time > 200 ms")
      environment.process_exit_code = 1
  else:
      environment.process_exit_code = 0

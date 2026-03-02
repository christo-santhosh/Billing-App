import time
from selenium import webdriver
from selenium.webdriver.common.by import By

options = webdriver.EdgeOptions()
options.add_argument('--headless')
driver = webdriver.Edge(options=options)

driver.get("http://127.0.0.1:8000/analytics/")
time.sleep(3)

print("Page Title:", driver.title)
try:
    # Check if Tom select rendered
    ward_ts = driver.find_element(By.CSS_SELECTOR, "#ward_id + .ts-wrapper")
    print("Ward Tom Select Wrapper:", ward_ts.get_attribute('outerHTML'))
    
    family_ts = driver.find_element(By.CSS_SELECTOR, "#family_id + .ts-wrapper")
    print("Family Tom Select Wrapper:", family_ts.get_attribute('outerHTML'))

    # Also log original elements
    print("Original Ward Select:", driver.find_element(By.ID, "ward_id").get_attribute('outerHTML'))
    print("Original Family Select:", driver.find_element(By.ID, "family_id").get_attribute('outerHTML'))

except Exception as e:
    print("Error finding Tom Select wrapper:", e)
    
driver.quit()

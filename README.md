# Online Car Rental System Project

The project entitled "ONLINE CAR RENTAL SYSTEM" is to design & create an Online Car Rental Portal to allow customers to enter their details, search for the cars in their location, specify the time period for the number of days of using the car, & also view the orders they made It also allows for the creation of new car dealers by entering their details & adding cars into their database by mentioning the car name, car image, car location, rent price per day, view the customer orders, and also the earnings made from all orders. Our Online Car Rental System allows us to connect to multiple car dealers & helps in providing the best cars to the customers in their specified location.

The Project is created using Python & Django Framework along with HTML, CSS, Javascript, & Bootstrap Front-End Technologies and supported with the back-end functionality of SQLite Database Browser.

## Current Rove frontend and dealer workspace

The Next.js customer site and dealer workspace share the Django API, authentication session, and SQLite database. Dealer access is available at `/dealer/login`; dealer accounts must be provisioned by the owner in Django admin (`/admin/`) by creating a Django user and its associated `CarDealer` record. There is no public dealer sign-up.

Run the backend from the project root:

```powershell
.venv\Scripts\python.exe manage.py runserver 8001
```

In a second terminal, run the frontend:

```powershell
cd frontend
npm run dev -- --webpack
```

Open `http://localhost:3000`. The dealer portal supports vehicle listing, editing, photo replacement, availability, booking status, and recorded earnings. Available dealer vehicles are reflected in the public customer fleet. Set `DJANGO_API_URL` in the frontend environment when Django runs on a different host or port. Set `DJANGO_ALLOWED_HOSTS` and `DJANGO_CSRF_TRUSTED_ORIGINS` for the deployment's hostnames.


![127 0 0 1_8000_ (1)](https://user-images.githubusercontent.com/26377100/187922324-4c9168c9-8294-4ea1-a1c7-1f00280507d5.jpg)

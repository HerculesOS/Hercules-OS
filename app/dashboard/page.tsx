export default function Dashboard() {
  return (
    <div>

      {/* Welcome */}
      <div className="mb-8">

        <h1 className="text-4xl font-bold">
          Welcome back 👋
        </h1>

        <p className="text-gray-500 mt-2">
          Manage your training business from one place.
        </p>

      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Revenue
          </p>

          <h2 className="text-3xl font-bold mt-2">
            £4,250
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Clients
          </p>

          <h2 className="text-3xl font-bold mt-2">
            18
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Bookings
          </p>

          <h2 className="text-3xl font-bold mt-2">
            34
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Certificates
          </p>

          <h2 className="text-3xl font-bold mt-2">
            112
          </h2>
        </div>

      </div>

      {/* Activity */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">

        <h2 className="text-2xl font-semibold">
          Recent Activity
        </h2>

        <div className="mt-6 flex flex-col gap-4">

          <div className="bg-gray-50 p-4 rounded-xl">
            New booking created
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            Invoice sent
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            Certificate generated
          </div>

        </div>

      </div>

    </div>
  )
}
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/ui/button'

export const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-3xl font-bold text-gray-800 mt-4">Page Not Found</h2>
        <p className="text-gray-600 mt-2 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  )
}

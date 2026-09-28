import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/rbac/auth';
import { ROLE_BY_KEY } from '@/rbac/roles';
import type { RoleKey } from '@/types/domain';

export default function NotFoundPage() {
  const { user } = useAuth();
  const home = ROLE_BY_KEY[user.role as RoleKey]?.defaultRoute ?? '/crm';
  return (
    <Card>
      <EmptyState
        icon={<Compass className="size-5" />}
        title="That screen does not exist"
        description="It may have moved, or you may have followed an old link."
        action={
          <Button variant="primary" asChild>
            <Link to={home}>Go to your home screen</Link>
          </Button>
        }
      />
    </Card>
  );
}

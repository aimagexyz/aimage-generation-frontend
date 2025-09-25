import { LuBuilding2, LuCalendar } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';

import { components } from '@/api/schemas';
import Loading from '@/components/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { UUID } from '@/types/common';

type Props = {
  project: components['schemas']['ProjectSimpleOut'];
};

function ProjectCard(props: Props) {
  const { project } = props;

  const navigate = useNavigate();

  const { setCurrentProjectId } = useAuth();

  if (!project) {
    return <Loading />;
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:bg-muted/50 active:bg-muted/100"
      onClick={() => {
        setCurrentProjectId(project.id as UUID);
        // eslint-disable-next-line sonarjs/void-use
        void navigate(`/projects/${project.id}/tasks`);
      }}
    >
      <CardHeader className="p-4 pb-2">
        <CardTitle title={'ProjectID: ' + project.id} className="flex items-start break-all">
          {project.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-muted-foreground text-xs flex items-center gap-1 pt-2">
          <LuBuilding2 />
        </p>
        <p className="text-muted-foreground text-xs flex items-center gap-1 pt-2">
          <LuCalendar />
        </p>
      </CardContent>
    </Card>
  );
}

export default ProjectCard;

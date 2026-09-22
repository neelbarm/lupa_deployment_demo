import { match, useNav } from "../router";
import { Landing } from "./Landing";
import { LearnerHome, LearnerShell, LearnLogin } from "./learn/LearnerPages";
import { ModulePlayer } from "./learn/ModulePlayer";
import { Presenter } from "./Presenter";
import { ClinicWorkspace } from "./team/ClinicWorkspace";
import { ConsoleShell } from "./team/ConsoleShell";
import { Library, LibraryModule } from "./team/Library";
import { Portfolio } from "./team/Portfolio";
import { StaffProfile } from "./team/StaffProfile";

export function AppRoutes() {
  const { path } = useNav();
  let m: Record<string, string> | null;

  if (path === "/present") return <Presenter />;

  if (path.startsWith("/learn")) {
    if ((m = match("/learn/:sid/m/:mid", path)))
      return (
        <LearnerShell staffId={m.sid}>
          <ModulePlayer key={m.mid} staffId={m.sid} moduleId={m.mid} backTo={`/learn/${m.sid}`} />
        </LearnerShell>
      );
    if ((m = match("/learn/:sid", path)))
      return (
        <LearnerShell staffId={m.sid}>
          <LearnerHome staffId={m.sid} />
        </LearnerShell>
      );
    return (
      <LearnerShell>
        <LearnLogin />
      </LearnerShell>
    );
  }

  if (path.startsWith("/team")) {
    let page: React.ReactNode = <Portfolio />;
    if ((m = match("/team/library/:mid/try", path))) page = <ModulePlayer key={m.mid} moduleId={m.mid} preview backTo="/team/library" />;
    else if ((m = match("/team/library/:mid", path))) page = <LibraryModule moduleId={m.mid} />;
    else if (match("/team/library", path)) page = <Library />;
    else if ((m = match("/team/clinic/:cid/staff/:sid", path))) page = <StaffProfile key={m.sid} clinicId={m.cid} staffId={m.sid} />;
    else if ((m = match("/team/clinic/:cid/:tab", path))) page = <ClinicWorkspace clinicId={m.cid} tab={m.tab} />;
    else if ((m = match("/team/clinic/:cid", path))) page = <ClinicWorkspace clinicId={m.cid} />;
    return <ConsoleShell>{page}</ConsoleShell>;
  }

  return <Landing />;
}

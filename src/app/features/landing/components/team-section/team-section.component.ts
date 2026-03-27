import { Component, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
interface TeamMember {
  name: string;
  role: string;
  image: string;
  socials: {
    icon: any; // غيرناها من string لـ any
    link: string;
    platform: string;
  }[];
}
@Component({
  selector: 'app-team-section',
  imports: [IconComponent],
  templateUrl: './team-section.component.html',
  styleUrl: './team-section.component.css',
})
export class TeamSectionComponent {
  teamMembers: TeamMember[] = [
    {
      name: 'نادر محمد',
      role: 'Front-End Developer',
      image: '/images/nader.png',
      socials: [
        { platform: 'Linkedin', icon: 'Linkedin02FreeIcons', link: '#' },
        { platform: 'Github', icon: 'GithubIcon', link: '#' },
        { platform: 'Twitter', icon: 'NewTwitterFreeIcons', link: '#' },
      ],
    },
    {
      name: 'بسمه جمال',
      role: 'Front-End Developer',
      image: '/images/basma.png',
      socials: [
        { platform: 'Linkedin', icon: 'Linkedin02FreeIcons', link: '#' },
        { platform: 'Github', icon: 'GithubIcon', link: '#' },
        { platform: 'Twitter', icon: 'NewTwitterFreeIcons', link: '#' },
      ],
    },
    {
      name: 'جهاد عاشور',
      role: 'UI/UX Designer',
      image: '/images/jehad.png',
      socials: [
        { platform: 'Linkedin', icon: 'Linkedin02FreeIcons', link: '#' },
        { platform: 'Behance', icon: 'Behance01FreeIcons', link: '#' },
        { platform: 'Twitter', icon: 'NewTwitterFreeIcons', link: '#' },
      ],
    },
    {
      name: 'أحمد هشام',
      role: 'Back-End Developer',
      image: '/images/ahmed.png',
      socials: [
        { platform: 'Linkedin', icon: 'Linkedin02FreeIcons', link: '#' },
        { platform: 'Github', icon: 'GithubIcon', link: '#' },
        { platform: 'Twitter', icon: 'NewTwitterFreeIcons', link: '#' },
      ],
    },
    {
      name: 'أريج حسنين',
      role: 'Back-End Developer',
      image: '/images/areej.png',
      socials: [
        { platform: 'Linkedin', icon: 'Linkedin02FreeIcons', link: '#' },
        { platform: 'Github', icon: 'GithubIcon', link: '#' },
        { platform: 'Twitter', icon: 'NewTwitterFreeIcons', link: '#' },
      ],
    },
    {
      name: 'مرام عامر',
      role: 'Back-End Developer',
      image: '/images/maram.png',
      socials: [
        { platform: 'Linkedin', icon: 'Linkedin02FreeIcons', link: '#' },
        { platform: 'Github', icon: 'GithubIcon', link: '#' },
        { platform: 'Twitter', icon: 'NewTwitterFreeIcons', link: '#' },
      ],
    },
  ];
}

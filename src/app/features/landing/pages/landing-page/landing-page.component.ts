import { Component,inject, OnInit } from '@angular/core';
import { LandingNavbarComponent } from "../../components/landing-navbar/landing-navbar.component";
import { IntroSectionComponent } from "../../components/intro-section/intro-section.component";
import { WhyPlanGoSectionComponent } from "../../components/why-plan-go-section/why-plan-go-section.component";
import { FeaturesSectionComponent } from "../../components/features-section/features-section.component";
import { StartSectionComponent } from "../../components/start-section/start-section.component";
import { AnimationService } from '../../../../core/services/animation.service';
import { SubscribtionSectionComponent } from "../../components/subscribtion-section/subscribtion-section.component";
import { TeamSectionComponent } from "../../components/team-section/team-section.component";
import { LandingFooterComponent } from "../../components/landing-footer/landing-footer.component";

@Component({
  selector: 'app-landing-page',
  imports: [LandingNavbarComponent, IntroSectionComponent, WhyPlanGoSectionComponent, FeaturesSectionComponent, StartSectionComponent, SubscribtionSectionComponent, TeamSectionComponent, LandingFooterComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent implements OnInit{
  public animationService = inject(AnimationService)
  ngOnInit(): void {
    this.animationService.initAos()
  }

}

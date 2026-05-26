<?php

namespace App\Forms;

use App\Entity\Bestellung;
use App\Entity\Department;
use App\Entity\Material\Artikel;
use App\Entity\Material\Hersteller;
use App\Entity\Material\Lieferant;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\Regex;

class BestellungFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $builder
            ->add('description', TextareaType::class)
//            ->add('descriptionZusatz', TextareaType::class)
            ->add('preis', TextType::class)
            ->add('gesamtpreis', TextType::class)
            ->add('packageunit', TextType::class)
            ->add('amount', TextType::class, [
                'required' => true,
                'constraints' => [
                    new NotBlank(message: 'Anzahl ist erforderlich.'),
                    new Regex([
                        'pattern' => '/^\d+([.,]\d+)?$/',
                        'message' => 'Anzahl muss eine positive Zahl sein (z.B. 2 oder 1,5).',
                    ]),
                ],
            ])
            ->add('artikels', EntityType::class, [
                'class' => Artikel::class, // The entity class
                'choice_label' => 'name', // Field to display in the dropdown
                'multiple' => true, // Allow multiple selections
                'expanded' => false, // Use dropdown (set to true for checkboxes)
                'required' => true, // Field is mandatory
                'placeholder' => 'Select artikel', // Placeholder text
            ])
            ->add('departments', EntityType::class, [
                'class' => Department::class, // The entity class
                'choice_label' => 'name', // Field to display in the dropdown
                'multiple' => true, // Allow multiple selections
                'expanded' => false, // Use dropdown (set to true for checkboxes)
                'required' => true, // Field is mandatory
                'placeholder' => 'Select departments', // Placeholder text
            ])
            ->add('herstellers', EntityType::class, [
                'class' => Hersteller::class, // The entity class
                'choice_label' => 'name', // Field to display in the dropdown
                'multiple' => true, // Allow multiple selections
                'expanded' => false, // Use dropdown (set to true for checkboxes)
                'required' => false, // Field is optional
                'placeholder' => 'Select Hersteller', // Placeholder text
            ])
            ->add('lieferants', EntityType::class, [
                'class' => Lieferant::class, // The entity class
                'choice_label' => 'name', // Field to display in the dropdown
                'multiple' => true, // Allow multiple selections
                'expanded' => false, // Use dropdown (set to true for checkboxes)
                'required' => false, // Field is optional
                'placeholder' => 'Select Lieferanten', // Placeholder text
            ]);
    }

    public function configureOptions(OptionsResolver $resolver)
    {
        $resolver->setDefaults(
            [
                'data_class' => Bestellung::class,
                'csrf_protection' => false, // Ensure CSRF protection is enabled,
                'allow_extra_fields' => true,
            ]
        );
    }

    public function getBlockPrefix(): string
    {
        return 'bestellung';
    }
}

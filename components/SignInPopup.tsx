"use client";
import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import CloseIcon from "@/components/icons/CloseIcon";
import Link from "next/link";
import { useUsersGetMe } from "@/lib/events";
import { useAuthPaths } from "@/lib/auth";
import { useIsClient } from "usehooks-ts";

type PopupProps = {
  header: string;
  description: string;
  opened: boolean;
  close?: () => void;
};
export default function SignInPopup({
  header,
  description,
  opened,
  close,
}: PopupProps) {
  const { signIn } = useAuthPaths();

  return (
    <Transition
      show={opened}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
    >
      <Dialog
        onClose={() => {
          close && close();
        }}
        className="relative z-50"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" aria-hidden="true" />
        </Transition.Child>

        <div
          className={`fixed inset-0 flex p-4 ${
            opened ? "overflow-y-scroll" : ""
          }`}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl h-fit my-auto rounded-xl bg-primary-main overflow-hidden">
              <Dialog.Title className="text-xl font-bold">
                <div className="flex flex-row w-full">
                  <div className="text-text-main grow items-center pl-4 sm:pl-8 pt-6">
                    {header}
                  </div>
                  <button
                    className="rounded-xl w-fit p-4"
                    onClick={() => {
                      close && close();
                    }}
                  >
                    <CloseIcon className="fill-icon-main/50 hover:fill-icon_hover w-10" />
                  </button>
                </div>
              </Dialog.Title>
              <div className="px-4 sm:px-8">
                <Dialog.Description className="text-text-secondary/75">
                  {description}
                </Dialog.Description>
                <Link
                  href={signIn}
                  className="my-8 flex justify-center items-center w-32 h-12 bg-focus_color text-white rounded-3xl font-semibold text-xl"
                >
                  Sign in
                </Link>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
